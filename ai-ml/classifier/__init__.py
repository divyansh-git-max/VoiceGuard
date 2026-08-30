# Makes ai-ml/classifier a Python package so backend can import it.




# -------------------------------
# train_colab.py
# How to use:
# 1. Go to colab.research.google.com
# 2. Runtime → Change runtime type → T4 GPU → Save
# 3. Upload train_colab.py  (or paste contents into a cell)
# 4. Upload the ASVspoof 2019 LA dataset zip
#    → register free at https://datashare.ed.ac.uk to get download link
# 5. Run all cells top to bottom (~40 min)
# 6. model.pkl auto-downloads to your browser
# 7. Copy it into  ai-ml/classifier/model.pkl
# 8. git add ai-ml/classifier/model.pkl && git commit -m "Add pretrained model.pkl" && git push