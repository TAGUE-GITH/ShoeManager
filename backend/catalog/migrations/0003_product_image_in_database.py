# Photos des produits stockees en base de donnees (les hebergeurs gratuits effacent le disque a chaque deploiement).
# Aucune photo n'existait encore : l'ancien champ fichier est simplement remplace.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('catalog', '0002_category_position'),
    ]

    operations = [
        migrations.RemoveField(model_name='productimage', name='image'),
        migrations.AddField(
            model_name='productimage',
            name='data',
            field=models.BinaryField(default=b'', verbose_name='photo'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='productimage',
            name='content_type',
            field=models.CharField(default='image/webp', max_length=30),
        ),
    ]
